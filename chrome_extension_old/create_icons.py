#!/usr/bin/env python3
"""
Simple script to create Chrome extension icons
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

import os

def create_simple_icon(size):
    """Create a simple icon using basic approach"""
    # Create a simple colored square as icon
    # This is a minimal approach that doesn't require PIL
    
    # For now, let's create a simple text-based icon file
    # We'll use a base64 encoded minimal PNG
    
    if size == 16:
        # Minimal 16x16 PNG (1x1 green pixel)
        icon_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x10\x00\x00\x00\x10\x08\x02\x00\x00\x00\x90\x91h6\x00\x00\x00\x12IDATx\x9cc\xf8\x0f\x00\x00\x01\x00\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    elif size == 48:
        # Minimal 48x48 PNG
        icon_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x000\x00\x00\x000\x08\x02\x00\x00\x00\x07\x03\xf6\xc0\x00\x00\x00\x12IDATx\x9cc\xf8\x0f\x00\x00\x01\x00\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    elif size == 128:
        # Minimal 128x128 PNG
        icon_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x80\x00\x00\x00\x80\x08\x02\x00\x00\x00L\\\xf6\x9c\x00\x00\x00\x12IDATx\x9cc\xf8\x0f\x00\x00\x01\x00\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    
    return icon_data

def create_icons():
    """Create all required icon files"""
    sizes = [16, 48, 128]
    
    for size in sizes:
        filename = f'icons/icon{size}.png'
        icon_data = create_simple_icon(size)
        
        with open(filename, 'wb') as f:
            f.write(icon_data)
        
        print(f"Created {filename}")

if __name__ == "__main__":
    # Ensure icons directory exists
    os.makedirs('icons', exist_ok=True)
    
    create_icons()
    print("All icons created successfully!")
