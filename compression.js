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
const resetBtn = document.getElementById('reset-btn');
const compressionProgress = document.querySelector('.compression-progress');
const progressFill = document.querySelector('.progress-fill');
const progressPercent = document.getElementById('progress-percent');
const actionButtons = document.querySelector('.action-buttons');
const errorMessage = document.querySelector('.error-message');
const successMessage = document.querySelector('.success-message');
const sizeOptions = document.querySelectorAll('.size-option');
const customSizeInput = document.getElementById('custom-size');
const qualityPriority = document.getElementById('quality-priority');

// Global variables
let originalVideo = null;
let compressedVideo = null;
let originalVideoSize = 0;
let targetSize = 10; // Default target size in MB
let supportedMimeTypes = getSupportedMimeTypes();
let activeAudioContext = null; // Track audio context for cleanup
let compressionActive = false; // Track compression state to prevent race conditions

// Detect supported mime types
function getSupportedMimeTypes() {
    if (!window.MediaRecorder) {
        return [];
    }

    // Try these MIME types in order of preference
    const types = [
        // Video + audio codecs in order of preference
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp9,vorbis',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp8,vorbis',
        'video/webm;codecs=h264,opus',
        'video/webm;codecs=h264,aac',
        'video/mp4;codecs=h264,aac',
        'video/mp4;codecs=h264,mp4a.40.2',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm;codecs=h264',
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

// Safely create and manage audio context
async function createAudioContext() {
    try {
        // Close existing context if it exists and is not closed
        if (activeAudioContext && activeAudioContext.state !== 'closed') {
            try {
                await activeAudioContext.close();
            } catch (e) {
                console.warn('Failed to close existing audio context:', e);
            }
        }

        // Create new audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            throw new Error('Web Audio API not supported');
        }

        activeAudioContext = new AudioContext();

        // Resume context if suspended (required by some browsers)
        if (activeAudioContext.state === 'suspended') {
            await activeAudioContext.resume();
        }

        return activeAudioContext;
    } catch (error) {
        console.error('Failed to create audio context:', error);
        activeAudioContext = null;
        throw error;
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    successMessage.classList.add('hidden');
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 5000);
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    setTimeout(() => {
        successMessage.classList.add('hidden');
    }, 5000);
}

function updateProgress(percent) {
    progressFill.style.width = `${percent}%`;
    progressPercent.textContent = `${Math.round(percent)}%`;
    // Update aria attribute for accessibility
    compressionProgress.setAttribute('aria-valuenow', Math.round(percent));
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
    originalSizeEl.textContent = '-';
    compressedSizeEl.textContent = '-';
    sizeReductionEl.textContent = '-';

    // Hide progress
    compressionProgress.classList.add('hidden');
    progressFill.style.width = '0%';
    progressPercent.textContent = '0%';
    compressionProgress.setAttribute('aria-valuenow', 0);

    // Reset buttons
    downloadBtn.disabled = true;
    compressBtn.disabled = false;
    compressBtn.textContent = 'Compress Video';

    // Clear messages
    errorMessage.classList.add('hidden');
    successMessage.classList.add('hidden');

    // Clear compressed video
    if (compressedVideo && compressedVideo.blob) {
        if (compressedVideo.url) {
            URL.revokeObjectURL(compressedVideo.url);
        }
    }
    compressedVideo = null;

    // Clean up audio context
    if (activeAudioContext && activeAudioContext.state !== 'closed') {
        try {
            activeAudioContext.close();
        } catch (e) {
            console.warn('Failed to close audio context:', e);
        }
    }
    activeAudioContext = null;
    
    // Reset compression state
    compressionActive = false;
}

// Memory usage estimation
function estimateMemoryUsage(fileSize, duration) {
    // Rough estimation: video decoding + canvas rendering + recording
    const decodingMemory = fileSize * 3; // Decoded frames use more memory
    const canvasMemory = 1920 * 1080 * 4 * 30; // Assume HD video at 30fps
    const recordingMemory = fileSize * 0.5; // Recording buffer

    return decodingMemory + canvasMemory + recordingMemory;
}

// Check if browser can handle the video
function canHandleVideo(fileSize, duration) {
    const estimatedMemory = estimateMemoryUsage(fileSize, duration);
    const maxSafeMemory = 1024 * 1024 * 1024; // 1GB safe limit

    if (estimatedMemory > maxSafeMemory) {
        return {
            canHandle: false,
            reason: 'Video may be too large for browser processing. Consider using a smaller video or desktop software.'
        };
    }

    return { canHandle: true };
}

// Video compression function
async function compressVideo(file, options) {
    return new Promise(async (resolve, reject) => {
        let video = null;
        let recorder = null;
        let stream = null;

        try {
            // Create video element to get metadata
            video = document.createElement('video');
            video.preload = 'metadata';
            video.muted = true; // Prevent audio feedback

            video.onloadedmetadata = async function() {
                try {
                    const duration = video.duration;

                    // Check if browser can handle this video
                    const memoryCheck = canHandleVideo(file.size, duration);
                    if (!memoryCheck.canHandle) {
                        throw new Error(memoryCheck.reason);
                    }

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d', { willReadFrequently: false });
                    const originalWidth = video.videoWidth;
                    const originalHeight = video.videoHeight;

                    // Calculate target bitrate based on target file size
                    // Target size in bytes / duration in seconds / 8 bits per byte = bits per second
                    const targetBitrate = Math.floor((options.targetSize * 1024 * 1024 * 8) / duration * 0.92); // 92% of theoretical max to account for container overhead

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

                    // Configure media recorder
                    stream = canvas.captureStream(30); // Capture at 30fps

                    // Check if the video has audio
                    let hasAudio = false;
                    video.muted = false; // Unmute to check audio

                    // More reliable audio detection
                    const testVideo = document.createElement('video');
                    testVideo.src = video.src;
                    await new Promise((resolve) => {
                        testVideo.addEventListener('loadeddata', () => {
                            // Check multiple browser-specific properties for audio
                            hasAudio = testVideo.mozHasAudio ||
                                      (testVideo.webkitAudioDecodedByteCount !== undefined && testVideo.webkitAudioDecodedByteCount > 0) ||
                                      (testVideo.audioTracks && testVideo.audioTracks.length > 0);
                            
                            // If all methods fail, assume audio exists to be safe
                            // This prevents trying to add non-existent audio tracks
                            if (hasAudio === undefined || hasAudio === null) {
                                hasAudio = true;
                            }
                            resolve();
                        });
                        
                        // Fallback in case loadeddata doesn't fire
                        setTimeout(() => {
                            hasAudio = true; // Conservative default
                            resolve();
                        }, 2000);
                    });

                    // Only try to add audio if the video has it
                    if (hasAudio) {
                        try {
                            // Create and setup audio context
                            const audioContext = await createAudioContext();
                            
                            const audioSource = audioContext.createMediaElementSource(video);
                            const audioDestination = audioContext.createMediaStreamDestination();

                            // Connect audio graph
                            audioSource.connect(audioDestination);
                            audioSource.connect(audioContext.destination); // Also play audio

                            // Add audio track to stream
                            const audioTracks = audioDestination.stream.getAudioTracks();
                            if (audioTracks.length > 0) {
                                stream.addTrack(audioTracks[0]);
                            }
                        } catch (audioError) {
                            console.warn('Could not add audio track:', audioError);
                            hasAudio = false; // Treat as video-only if audio setup fails
                            // Continue without audio if it fails
                        }
                    }

                    // Find a MIME type that works with our stream configuration
                    let selectedMimeType = null;
                    let recorderOptions = null;

                    if (supportedMimeTypes.length === 0) {
                        throw new Error('No supported video formats found. Please use a modern browser like Chrome or Firefox.');
                    }

                    for (const mimeType of supportedMimeTypes) {
                        try {
                            recorderOptions = {
                                mimeType: mimeType,
                                videoBitsPerSecond: Math.max(videoBitrate, 100000) // Ensure minimum bitrate
                            };

                            if (hasAudio && stream.getAudioTracks().length > 0) {
                                recorderOptions.audioBitsPerSecond = Math.max(audioBitrate, 32000); // Ensure minimum audio bitrate
                            }

                            // Test if this configuration works
                            const testRecorder = new MediaRecorder(stream, recorderOptions);
                            
                            // Test if the recorder can actually start (some browsers fail silently)
                            testRecorder.start();
                            testRecorder.stop();
                            
                            selectedMimeType = mimeType;
                            break;
                        } catch (e) {
                            console.warn(`MediaRecorder configuration failed for ${mimeType}:`, e);
                            // Try the next MIME type
                        }
                    }

                    if (!selectedMimeType) {
                        throw new Error('No compatible MediaRecorder configuration found. Your browser may not support video compression.');
                    }

                    console.log('Using MIME type:', selectedMimeType);

                    recorder = new MediaRecorder(stream, recorderOptions);
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
                            // Stop drawing if compression is no longer active
                            if (!compressionActive || video.paused || video.ended) {
                                if (recorder.state !== 'inactive') {
                                    recorder.stop();
                                }
                                compressionActive = false;
                                return;
                            }

                            // Draw current frame
                            ctx.drawImage(video, 0, 0, width, height);

                            // Update progress only if compression is still active
                            if (compressionActive) {
                                const progress = (video.currentTime / duration) * 100;
                                updateProgress(progress);
                            }

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
                    // Clean up on error
                    if (stream) {
                        stream.getTracks().forEach(track => track.stop());
                    }
                    if (recorder && recorder.state !== 'inactive') {
                        recorder.stop();
                    }
                    // Clean up audio context on error
                    if (activeAudioContext && activeAudioContext.state !== 'closed') {
                        try {
                            activeAudioContext.close();
                        } catch (e) {
                            console.warn('Failed to close audio context on error:', e);
                        }
                        activeAudioContext = null;
                    }
                    // Clean up video blob URL
                    if (video && video.src && video.src.startsWith('blob:')) {
                        URL.revokeObjectURL(video.src);
                    }
                    reject(error);
                }
            };

            video.onerror = () => {
                // Clean up on video error
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
                // Clean up audio context on video error
                if (activeAudioContext && activeAudioContext.state !== 'closed') {
                    try {
                        activeAudioContext.close();
                    } catch (e) {
                        console.warn('Failed to close audio context on video error:', e);
                    }
                    activeAudioContext = null;
                }
                reject(new Error('Error loading video'));
            };

            // Set the source to the file
            video.src = URL.createObjectURL(file);

            // Clean up blob URL after loading
            video.onload = () => {
                URL.revokeObjectURL(video.src);
            };
        } catch (error) {
            // Final cleanup
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            // Final audio context cleanup
            if (activeAudioContext && activeAudioContext.state !== 'closed') {
                try {
                    activeAudioContext.close();
                } catch (e) {
                    console.warn('Failed to close audio context in final cleanup:', e);
                }
                activeAudioContext = null;
            }
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

    // Prevent multiple compressions running simultaneously
    if (compressionActive) {
        showError('Compression is already in progress.');
        return;
    }

    try {
        // Set compression as active
        compressionActive = true;
        
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
            showSuccess(`Video compressed successfully! Size reduced by ${reduction}%.`);
        }
    } catch (error) {
        console.error('Compression error:', error);
        showError(`Compression failed: ${error.message}`);

        // Remove spinner and enable button
        removeSpinnerFromButton(compressBtn);
        compressBtn.disabled = false;
        compressBtn.textContent = 'Compress Video';
    } finally {
        // Always reset compression state
        compressionActive = false;
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

        // Generate filename with improved extension handling
        const originalFilename = originalVideo.name || 'video';
        const lastDotIndex = originalFilename.lastIndexOf('.');
        
        // Extract base name (everything before the last dot, or whole filename if no dot)
        const baseName = lastDotIndex > 0 ? originalFilename.substring(0, lastDotIndex) : originalFilename;
        
        // Clean base name (remove any characters that could cause issues)
        const cleanBaseName = baseName.replace(/[<>:"/\\|?*]/g, '_').trim() || 'video';
        
        // Ensure we have a valid file extension
        const validExtension = compressedVideo.fileExt || 'webm';
        
        const newFilename = `${cleanBaseName}_compressed.${validExtension}`;

        a.download = newFilename;
        a.click();

        // Clean up
        URL.revokeObjectURL(a.href);

        // Remove spinner
        removeSpinnerFromButton(downloadBtn);
        downloadBtn.textContent = 'Download';

        // Show success message
        showSuccess('Video downloaded successfully!');
    }, 500);
});

// Reset button handler
resetBtn.addEventListener('click', () => {
    // Reset everything
    resetUI();

    // Hide preview and action buttons
    previewContainer.classList.add('hidden');
    actionButtons.classList.add('hidden');

    // Clear the file input
    videoUpload.value = '';

    // Reset original video
    originalVideo = null;
    originalVideoSize = 0;

    // Show success message
    showSuccess('Ready to compress a new video!');
});

// Size option selection
sizeOptions.forEach(option => {
    option.addEventListener('click', () => {
        // Update active class and aria-pressed
        sizeOptions.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });
        option.classList.add('active');
        option.setAttribute('aria-pressed', 'true');

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
    const value = customSizeInput.value.trim();
    
    if (value) {
        const numValue = parseFloat(value);
        
        // Validate input
        if (isNaN(numValue) || numValue <= 0 || numValue > 2000) {
            showError('Please enter a valid size between 1 and 2000 MB.');
            customSizeInput.classList.add('error');
            return;
        }
        
        // Remove error styling if valid
        customSizeInput.classList.remove('error');
        
        // Update target size (round to avoid decimal issues)
        targetSize = Math.round(numValue);

        // Remove active class from size options and update aria attributes
        sizeOptions.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });

        // Check if current video is under the new target size
        if (originalVideo && originalVideoSize <= targetSize * 1024 * 1024) {
            showError(`The uploaded video is already under the ${targetSize}MB target size. Compression may not be necessary.`);
        }
    } else {
        // Remove error styling when input is empty
        customSizeInput.classList.remove('error');
    }
});

// Additional validation on blur
customSizeInput.addEventListener('blur', () => {
    const value = customSizeInput.value.trim();
    if (value) {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0 || numValue > 2000) {
            customSizeInput.value = '';
            customSizeInput.classList.remove('error');
            // Revert to default 10MB if no valid input
            targetSize = 10;
            sizeOptions[0].classList.add('active');
            sizeOptions[0].setAttribute('aria-pressed', 'true');
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
