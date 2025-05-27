# PixRelay

PixRelay is a fast and efficient image processing service. With PixRelay, you can easily resize images from any URL without manually downloading and uploading them.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Usage](#api-usage)
- [URL Encoding](#url-encoding)
- [Usage Tips](#usage-tips)
- [Code Examples](#code-examples)
- [License](#license)

## Features

- Resize images to specific width
- Crop and resize images to specific dimensions
- Automatic WebP conversion for better performance
- Configurable caching system
- Support for long URLs (up to 8KB)

## Quick Start

### Using Docker (Recommended)

1. Pull the image from Docker Hub:

```bash
docker pull alfatta/pixrelay
```

2. Run the container:

```bash
# With caching enabled (default)
docker run -d -p 3000:3000 -v $(pwd)/cache:/app/cache alfatta/pixrelay

# With caching disabled
docker run -d -p 3000:3000 -e USE_CACHE=false alfatta/pixrelay

# With custom port
docker run -d -p 8080:8080 -e PORT=8080 alfatta/pixrelay
```

### Using Docker Compose

1. Create a `docker-compose.yml` file:

```yaml
version: "3.8"
services:
  app:
    image: alfatta/pixrelay
    ports:
      - "3000:3000"
    volumes:
      - ./cache:/app/cache
    environment:
      - USE_CACHE=true # Optional, defaults to true
      - PORT=3000 # Optional, defaults to 3000
```

2. Run:

```bash
docker compose up -d
```

## Environment Variables

- `USE_CACHE`: Enable/disable caching (default: true)
- `PORT`: Server port (default: 3000)

## API Usage

### 1. Resize Image

Resize an image to a specific width (maintains aspect ratio):

```
GET http://localhost:3000/img/{encodedUrl}/resize?size=300
```

Example:

```bash
# Resize image to 300px width
curl "http://localhost:3000/img/aHR0cHM6Ly9leGFtcGxlLmNvbS9pbWFnZS5qcGc/resize?size=300"
```

### 2. Fit Image

Resize and crop an image to specific dimensions:

```
GET http://localhost:3000/img/{encodedUrl}/fit?size=300x200
```

Example:

```bash
# Resize and crop image to 300x200px
curl "http://localhost:3000/img/aHR0cHM6Ly9leGFtcGxlLmNvbS9pbWFnZS5qcGc/fit?size=300x200"
```

## URL Encoding

Before using the API, you need to encode your image URLs. Here's how:

### Using Node.js

```javascript
const encodeUrl = (url) => {
  return Buffer.from(url)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

// Example
const imageUrl = "https://example.com/image.jpg";
const encodedUrl = encodeUrl(imageUrl);
console.log(encodedUrl);
```

### Using Python

```python
import base64

def encode_url(url):
    encoded = base64.urlsafe_b64encode(url.encode()).decode()
    return encoded.rstrip('=')

# Example
image_url = 'https://example.com/image.jpg'
encoded_url = encode_url(image_url)
print(encoded_url)
```

### Using Command Line

```bash
echo -n "https://example.com/image.jpg" | base64 | tr '+/' '-_' | tr -d '='
```

## Usage Tips

1. **Long URLs**:

   - Maximum supported URL length is 8KB
   - Use a URL shortener if your URL is too long

2. **Caching**:

   - Processed images are automatically cached when enabled
   - Cache is stored in the `./cache` directory
   - Cache expires after 24 hours
   - Can be disabled by setting `USE_CACHE=false`

3. **Output Format**:

   - All images are converted to WebP format
   - WebP provides smaller file sizes with good quality

4. **Error Handling**:

   - Image not found: 404
   - Invalid size parameter: 400
   - Server error: 500

## Code Examples

### HTML

```html
<img
  src="http://localhost:3000/img/aHR0cHM6Ly9leGFtcGxlLmNvbS9pbWFnZS5qcGc/resize?size=300"
  alt="Resized Image"
/>
```

### CSS

```css
.thumbnail {
  background-image: url("http://localhost:3000/img/aHR0cHM6Ly9leGFtcGxlLmNvbS9pbWFnZS5qcGc/fit?size=150x150");
}
```

### JavaScript

```javascript
const imageUrl = "https://example.com/large-image.jpg";
const encodedUrl = encodeUrl(imageUrl);
const resizedUrl = `http://localhost:3000/img/${encodedUrl}/resize?size=300`;
```

## License

MIT
