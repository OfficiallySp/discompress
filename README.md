# Discord Tools

A combined suite of browser-based tools for Discord users: **video compression** and **markdown formatting**. All processing happens locally in your browser.

## Tools

### Video Compressor (DisCompress)
Compress videos to fit Discord's file size limits—no uploads required.

### Markdown Formatter
Format text for Discord with bold, italic, code blocks, spoilers, timestamps, and more. Live preview and template support.

---

## Video Compressor Features

- **Privacy-Focused**: All processing happens locally in your browser - no server uploads
- **Discord-Optimized**: Preset sizes for Discord Free (10MB), Nitro Basic (50MB), and Nitro (500MB)
- **Flexible Options**: Custom target sizes up to 2GB
- **Quality Control**: Three compression modes - Balanced, Higher Quality, or Smaller Size
- **Modern Interface**: Clean, Discord-themed UI with animations and progress tracking
- **Wide Format Support**: Works with MP4, WebM, MOV, AVI, and more
- **Real-time Progress**: Visual progress bar with percentage tracking
- **Before/After Comparison**: See original and compressed file sizes
- **Drag-and-Drop**: Easy file upload with drag-and-drop support
- **Memory Safety**: Built-in checks to prevent browser crashes with large files
- **Accessibility**: Full keyboard navigation and screen reader support

## How to Use

1. Go to https://discordtools.officiallysp.net/
2. Drag and drop a video file onto the upload area, or click to select a file
3. Select your target file size:
   - 10MB (Discord Free)
   - 50MB (Discord Nitro Basic)
   - 500MB (Discord Nitro)
   - Or enter a custom size up to 2000MB
4. Choose your quality priority:
   - **Balanced** (Recommended) - Good balance between quality and compression
   - **Higher Quality** - Maintains better quality but may not reach target size
   - **Smaller Size** - Prioritizes reaching the target size, may reduce quality
5. Click "Compress Video"
6. Once compression is complete, preview the compressed video
7. Click "Download" to save the compressed video
8. Use "New Video" to compress another file

## Requirements

- A modern web browser (Chrome, Firefox, or Edge recommended)
- Browser must support the following technologies:
  - MediaRecorder API
  - WebM/MP4 video formats
  - VP9/VP8/H.264 video codecs
  - Canvas API with captureStream
  - Web Audio API

## Privacy

DisCompress processes all videos directly in your browser. No video data is ever uploaded to any server, ensuring complete privacy and security of your content.

## Technical Details

### Supported Codecs
- VP9 with Opus audio (preferred)
- VP8 with Opus/Vorbis audio
- H.264 with AAC audio
- Fallback to basic WebM/MP4

### Compression Algorithm
- Dynamic bitrate calculation based on video duration and target size
- Adaptive resolution scaling for size-priority mode
- Frame-by-frame canvas rendering for precise control
- Maintains original aspect ratio
- Preserves audio tracks when possible

## Limitations

- Very large videos (>2GB) may cause browser performance issues
- Processing speed depends on your device's performance
- Some older browsers may not support all features
- Mobile browsers may have additional memory constraints
- Final file size may vary slightly from target due to codec overhead

## Troubleshooting

### Video won't compress
- Ensure your browser is up to date
- Try a smaller video file
- Check browser console for specific error messages
- Try a different quality setting

### Audio is missing
- Some video formats may not preserve audio
- Try using a different source video format
- Audio tracks with unusual codecs may not be supported

### Browser crashes or freezes
- The video file may be too large for browser processing
- Try closing other tabs to free up memory
- Consider using desktop compression software for very large files

## Browser Compatibility

- ✅ Chrome/Chromium (version 90+)
- ✅ Firefox (version 88+)
- ✅ Microsoft Edge (version 90+)
- ⚠️ Safari (limited codec support)
- ❌ Internet Explorer (not supported)

## Updates (Latest)

- Added memory safety checks to prevent browser crashes
- Improved audio handling and codec support
- Enhanced UI with animations and better visual feedback
- Added success/error message system
- Implemented "New Video" button for easier workflow
- Added accessibility features (ARIA labels, keyboard navigation)
- Expanded codec support for better compatibility
- Added progress hints during compression
- Improved file size calculations and estimates
