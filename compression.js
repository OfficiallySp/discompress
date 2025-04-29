// DOM Elements
const videoUpload = document.getElementById('video-upload');
const uploadContainer = document.querySelector('.upload-container');
const previewContainer = document.querySelector('.preview-container');
const previewVideo = document.getElementById('preview-video');
const originalSizeEl = document.getElementById('original-size');
const compressedSizeEl = document.getElementById('compressed-size');
const sizeReductionEl = document.getElementById('size-reduction');
const compressBtn = document.getElementById('compress-btn');
const downloadBtn = document.getElementById('download-btn');
const compressionProgress = document.querySelector('.compression-progress');
const progressFill = document.querySelector('.progress-fill');
const progressPercent = document.getElementById('progress-percent');
const actionButtons = document.querySelector('.action-buttons');
const errorMessage = document.querySelector('.error-message');
const sizeOptions = document.querySelectorAll('.size-option');
const customSizeInput = document.getElementById('custom-size');
const qualityPriority = document.getElementById('quality-priority');

// Global variables
let originalVideo = null;
let compressedVideo = null;
let originalVideoSize = 0;
let targetSize = 10; // Default target size in MB
let supportedMimeTypes = getSupportedMimeTypes();

// Detect supported mime types
function getSupportedMimeTypes() {
    if (!window.MediaRecorder) {
        return [];
    }

    // Try these MIME types in order of preference
    const types = [
        // Video + audio codecs in order of preference
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/mp4;codecs=h264,aac',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4'
    ];

    return types.filter(type => MediaRecorder.isTypeSupported(type));
}

// Helper functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 5000);
}

function updateProgress(percent) {
    progressFill.style.width = `${percent}%`;
    progressPercent.textContent = `${Math.round(percent)}%`;
}

// Add loading spinner to button
function addSpinnerToButton(button) {
    // Create spinner
    const spinner = document.createElement('span');
    spinner.className = 'loading-spinner';

    // Add spinner to button
    button.prepend(spinner);
    button.classList.add('loading');
}

// Remove loading spinner from button
function removeSpinnerFromButton(button) {
    const spinner = button.querySelector('.loading-spinner');
    if (spinner) {
        spinner.remove();
    }
    button.classList.remove('loading');
}

// Initialize drag and drop
function initDragAndDrop() {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadContainer.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadContainer.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadContainer.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        uploadContainer.classList.add('highlight');
    }

    function unhighlight() {
        uploadContainer.classList.remove('highlight');
    }

    uploadContainer.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0 && files[0].type.startsWith('video/')) {
            handleFileSelect(files[0]);
        } else {
            showError('Please drop a valid video file.');
        }
    }
}

// Handle file selection
function handleFileSelect(file) {
    if (!file.type.startsWith('video/')) {
        showError('Please select a valid video file.');
        return;
    }

    // Check file size
    if (file.size > 2000 * 1024 * 1024) { // 2GB limit
        showError('File is too large. Maximum size allowed is 2GB.');
        return;
    }

    // Reset UI
    resetUI();

    // Store original video
    originalVideo = file;
    originalVideoSize = file.size;

    // Display file info
    originalSizeEl.textContent = formatFileSize(originalVideoSize);

    // Create video preview
    const videoURL = URL.createObjectURL(file);
    previewVideo.src = videoURL;

    // Show preview and action buttons
    previewContainer.classList.remove('hidden');
    actionButtons.classList.remove('hidden');

    // Check if video is already under target size
    if (originalVideoSize <= targetSize * 1024 * 1024) {
        showError(`The uploaded video is already under the ${targetSize}MB target size. Compression may not be necessary but you can still proceed if you want to reduce the size further.`);
    }
}

// Reset UI elements
function resetUI() {
    // Reset preview
    if (previewVideo.src) {
        URL.revokeObjectURL(previewVideo.src);
        previewVideo.src = '';
    }

    // Reset size info
    compressedSizeEl.textContent = '-';
    sizeReductionEl.textContent = '-';

    // Hide progress
    compressionProgress.classList.add('hidden');
    progressFill.style.width = '0%';
    progressPercent.textContent = '0%';

    // Reset buttons
    downloadBtn.disabled = true;

    // Clear error
    errorMessage.classList.add('hidden');

    // Clear compressed video
    compressedVideo = null;
}

// Video compression function
async function compressVideo(file, options) {
    return new Promise(async (resolve, reject) => {
        try {
            // Create video element to get metadata
            const video = document.createElement('video');
            video.preload = 'metadata';

            video.onloadedmetadata = async function() {
                const duration = video.duration;
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const originalWidth = video.videoWidth;
                const originalHeight = video.videoHeight;

                // Calculate target bitrate based on target file size
                // Target size in bytes / duration in seconds / 8 bits per byte = bits per second
                const targetBitrate = Math.floor((options.targetSize * 1024 * 1024 * 8) / duration * 0.95); // 95% of theoretical max to account for container overhead

                // Set quality based on priority
                let videoBitrate, audioBitrate, width, height;

                switch(options.qualityPriority) {
                    case 'quality':
                        // Higher quality, might not reach target size
                        videoBitrate = Math.max(targetBitrate * 0.9, 500000); // 90% for video, min 500kbps
                        audioBitrate = Math.max(targetBitrate * 0.1, 128000); // 10% for audio, min 128kbps
                        width = originalWidth;
                        height = originalHeight;
                        break;
                    case 'size':
                        // Lower quality, prioritize meeting target size
                        videoBitrate = Math.max(targetBitrate * 0.85, 350000); // 85% for video, min 350kbps
                        audioBitrate = Math.max(targetBitrate * 0.1, 96000);  // 10% for audio, min 96kbps
                        // Reduce resolution if needed
                        const scaleFactor = Math.min(1, Math.sqrt(targetBitrate / 2000000));
                        width = Math.floor(originalWidth * scaleFactor);
                        height = Math.floor(originalHeight * scaleFactor);
                        // Ensure even dimensions (required by some codecs)
                        width = width - (width % 2);
                        height = height - (height % 2);
                        break;
                    default: // balanced
                        videoBitrate = Math.max(targetBitrate * 0.87, 450000); // 87% for video, min 450kbps
                        audioBitrate = Math.max(targetBitrate * 0.1, 128000);  // 10% for audio, min 128kbps
                        // Reduce resolution slightly if needed
                        const balancedScaleFactor = Math.min(1, Math.sqrt(targetBitrate / 1500000));
                        width = Math.floor(originalWidth * balancedScaleFactor);
                        height = Math.floor(originalHeight * balancedScaleFactor);
                        // Ensure even dimensions
                        width = width - (width % 2);
                        height = height - (height % 2);
                }

                // Set canvas dimensions
                canvas.width = width;
                canvas.height = height;

                try {
                    // Configure media recorder
                    const stream = canvas.captureStream();

                    // Check if the video has audio
                    let hasAudio = false;
                    if (video.mozHasAudio !== undefined) {
                        hasAudio = video.mozHasAudio;
                    } else if (video.webkitAudioDecodedByteCount !== undefined) {
                        hasAudio = video.webkitAudioDecodedByteCount > 0;
                    } else {
                        // Assume video has audio if we can't detect
                        hasAudio = true;
                    }

                    // Only try to add audio if the video has it
                    if (hasAudio) {
                        try {
                            // Create an audio context and source
                            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                            const audioSource = audioCtx.createMediaElementSource(video);
                            const audioDestination = audioCtx.createMediaStreamDestination();
                            audioSource.connect(audioDestination);

                            // Add audio track to stream
                            stream.addTrack(audioDestination.stream.getAudioTracks()[0]);
                        } catch (audioError) {
                            console.warn('Could not add audio track', audioError);
                            // Continue without audio if it fails
                        }
                    }

                    // Find a MIME type that works with our stream configuration
                    let selectedMimeType = null;
                    let recorderOptions = null;

                    for (const mimeType of supportedMimeTypes) {
                        try {
                            recorderOptions = {
                                mimeType: mimeType,
                                videoBitsPerSecond: videoBitrate
                            };

                            if (hasAudio) {
                                recorderOptions.audioBitsPerSecond = audioBitrate;
                            }

                            // Test if this configuration works
                            const testRecorder = new MediaRecorder(stream, recorderOptions);
                            selectedMimeType = mimeType;
                            break;
                        } catch (e) {
                            console.warn(`MediaRecorder configuration failed for ${mimeType}:`, e);
                            // Try the next MIME type
                        }
                    }

                    if (!selectedMimeType) {
                        throw new Error('No compatible MediaRecorder configuration found');
                    }

                    console.log('Using MIME type:', selectedMimeType);

                    const recorder = new MediaRecorder(stream, recorderOptions);
                    const chunks = [];

                    recorder.ondataavailable = e => {
                        if (e.data.size > 0) {
                            chunks.push(e.data);
                        }
                    };

                    recorder.onstop = () => {
                        // Get the appropriate mime type for the blob
                        const fileExt = selectedMimeType.includes('webm') ? 'webm' : 'mp4';

                        const blob = new Blob(chunks, { type: selectedMimeType });
                        resolve({ blob, fileExt });
                    };

                    // Set up video events
                    video.addEventListener('play', function() {
                        // Start recording when video plays
                        recorder.start(1000); // 1-second chunks

                        // Draw video frames to canvas
                        function drawFrame() {
                            if (video.paused || video.ended) {
                                if (recorder.state !== 'inactive') {
                                    recorder.stop();
                                }
                                return;
                            }

                            // Draw current frame
                            ctx.drawImage(video, 0, 0, width, height);

                            // Update progress
                            const progress = (video.currentTime / duration) * 100;
                            updateProgress(progress);

                            // Request next frame
                            requestAnimationFrame(drawFrame);
                        }

                        drawFrame();
                    });

                    video.addEventListener('ended', function() {
                        // Ensure recorder is stopped when video ends
                        if (recorder.state !== 'inactive') {
                            recorder.stop();
                        }
                    });

                    video.addEventListener('error', function() {
                        reject(new Error('Error playing video for compression'));
                    });

                    // Start playback
                    try {
                        await video.play();
                    } catch (playError) {
                        // Handle autoplay restrictions
                        reject(new Error('Could not autoplay video for compression. Please try again.'));
                    }
                } catch (error) {
                    reject(error);
                }
            };

            video.onerror = () => reject(new Error('Error loading video'));

            // Set the source to the file
            video.src = URL.createObjectURL(file);
        } catch (error) {
            reject(error);
        }
    });
}

// Event Listeners
videoUpload.addEventListener('change', () => {
    if (videoUpload.files.length > 0) {
        handleFileSelect(videoUpload.files[0]);
    }
});

compressBtn.addEventListener('click', async () => {
    if (!originalVideo) {
        showError('Please upload a video first.');
        return;
    }

    try {
        // Show progress and disable button
        compressionProgress.classList.remove('hidden');
        compressBtn.disabled = true;

        // Add spinner to button
        addSpinnerToButton(compressBtn);

        // Get compression settings
        const options = {
            targetSize: targetSize, // in MB
            qualityPriority: qualityPriority.value
        };

        // Update button text
        compressBtn.textContent = 'Compressing...';

        // Compress video
        const { blob, fileExt } = await compressVideo(originalVideo, options);
        compressedVideo = { blob, fileExt };

        // Update UI
        compressedSizeEl.textContent = formatFileSize(blob.size);

        // Calculate size reduction
        const reduction = ((originalVideoSize - blob.size) / originalVideoSize * 100).toFixed(1);
        sizeReductionEl.textContent = `${reduction}%`;

        // Update preview
        previewVideo.src = URL.createObjectURL(blob);

        // Enable download button
        downloadBtn.disabled = false;

        // Remove spinner and enable compress button
        removeSpinnerFromButton(compressBtn);
        compressBtn.disabled = false;

        // Change compress button text if video is still larger than target
        if (blob.size > targetSize * 1024 * 1024) {
            compressBtn.textContent = 'Compress Again';
            showError(`The compressed video is still larger than the target size. Try compressing again or using different settings.`);
        } else {
            compressBtn.textContent = 'Compress Video';
        }
    } catch (error) {
        console.error('Compression error:', error);
        showError(`Compression failed: ${error.message}`);

        // Remove spinner and enable button
        removeSpinnerFromButton(compressBtn);
        compressBtn.disabled = false;
        compressBtn.textContent = 'Compress Video';
    }
});

downloadBtn.addEventListener('click', () => {
    if (!compressedVideo || !compressedVideo.blob) return;

    // Add spinner to button
    addSpinnerToButton(downloadBtn);
    downloadBtn.textContent = 'Preparing...';

    // Small delay to show spinner (some browsers download too quickly)
    setTimeout(() => {
        // Create download link
        const a = document.createElement('a');
        a.href = URL.createObjectURL(compressedVideo.blob);

        // Generate filename
        const originalFilename = originalVideo.name;
        const fileExtension = originalFilename.substring(originalFilename.lastIndexOf('.'));
        const newFilename = originalFilename.replace(fileExtension, '') + '_compressed.' + compressedVideo.fileExt;

        a.download = newFilename;
        a.click();

        // Clean up
        URL.revokeObjectURL(a.href);

        // Remove spinner
        removeSpinnerFromButton(downloadBtn);
        downloadBtn.textContent = 'Download';
    }, 500);
});

// Size option selection
sizeOptions.forEach(option => {
    option.addEventListener('click', () => {
        // Update active class
        sizeOptions.forEach(btn => btn.classList.remove('active'));
        option.classList.add('active');

        // Update target size
        targetSize = parseInt(option.dataset.size);

        // Clear custom input
        customSizeInput.value = '';

        // Check if current video is under the new target size
        if (originalVideo && originalVideoSize <= targetSize * 1024 * 1024) {
            showError(`The uploaded video is already under the ${targetSize}MB target size. Compression may not be necessary.`);
        }
    });
});

// Custom size input
customSizeInput.addEventListener('input', () => {
    if (customSizeInput.value) {
        // Update target size
        targetSize = parseInt(customSizeInput.value);

        // Remove active class from size options
        sizeOptions.forEach(btn => btn.classList.remove('active'));

        // Check if current video is under the new target size
        if (originalVideo && originalVideoSize <= targetSize * 1024 * 1024) {
            showError(`The uploaded video is already under the ${targetSize}MB target size. Compression may not be necessary.`);
        }
    }
});

// Initialize drag and drop
initDragAndDrop();

// Check browser compatibility
function checkBrowserCompatibility() {
    let compatibilityIssues = [];

    // Check for MediaRecorder API
    if (!window.MediaRecorder) {
        compatibilityIssues.push('MediaRecorder API is not supported.');
        compressBtn.disabled = true;
    }

    // Check for supported video formats
    if (supportedMimeTypes.length === 0) {
        compatibilityIssues.push('No supported video encoding formats found.');
        compressBtn.disabled = true;
    }

    // Check for Canvas API
    const canvas = document.createElement('canvas');
    if (!canvas.getContext || !canvas.captureStream) {
        compatibilityIssues.push('Canvas API or captureStream method is not supported.');
        compressBtn.disabled = true;
    }

    // Display compatibility issues if any
    if (compatibilityIssues.length > 0) {
        const message = `Browser compatibility issues detected: ${compatibilityIssues.join(' ')} Please use a modern browser like Chrome or Firefox.`;
        showError(message);
        return false;
    }

    return true;
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    const compatible = checkBrowserCompatibility();

    if (compatible) {
        console.log('Browser compatibility check passed');
        console.log('Supported video formats:', supportedMimeTypes);
    }
});
