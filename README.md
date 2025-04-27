# DisCompress

A browser-based video compression tool specifically designed for Discord file size limits. Compress your videos to fit Discord's file size restrictions without leaving your browser.

## Features

- Compress videos to fit Discord's file size limits (10MB, 50MB, 500MB)
- Adjustable quality settings to prioritize quality or size
- Custom target size options
- Real-time compression progress
- Before/after size comparison
- Drag-and-drop file upload

## How to Use

1. Open `index.html` in a modern web browser (Chrome or Firefox recommended)
2. Drag and drop a video file onto the upload area, or click to select a file
3. Select your target file size:
   - 10MB (Discord Free)
   - 50MB (Discord Nitro Basic)
   - 500MB (Discord Nitro)
   - Or enter a custom size
4. Choose your quality priority:
   - Balanced (default) - Good balance between quality and compression
   - Higher Quality - Maintains better quality but may not reach target size
   - Smaller Size - Prioritizes reaching the target size, may reduce quality
5. Click "Compress Video"
6. Once compression is complete, preview the compressed video
7. Click "Download" to save the compressed video

## Requirements

- A modern web browser (Chrome, Firefox, or Edge recommended)
- Browser must support the following technologies:
  - MediaRecorder API
  - WebM video format
  - VP9 video codec
  - Canvas API

## Privacy

DisCompress processes all videos directly in your browser. No video data is ever uploaded to any server, ensuring your privacy.

## Limitations

- Very large videos may cause browser performance issues
- Compression quality depends on the source video and browser capabilities
- Some browsers may have memory limitations for large videos
- Compression is done using the VP9 codec, which provides good quality but may not be as efficient as some desktop software

## Technical Details

DisCompress uses the following browser technologies:
- Canvas API to capture video frames
- MediaRecorder API to encode the compressed video
- WebM container format with VP9 video codec
- Web Audio API to handle audio tracks
- File API for file handling

## License

This project is available for free use.

## Credits

Created by [Your Name]
