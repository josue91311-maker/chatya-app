import os
import uuid
import cloudinary
import cloudinary.uploader
from app.core.config import settings


def _cloudinary_configured() -> bool:
    """Check if Cloudinary credentials are set."""
    return bool(
        getattr(settings, "CLOUDINARY_CLOUD_NAME", "")
        and getattr(settings, "CLOUDINARY_API_KEY", "")
        and getattr(settings, "CLOUDINARY_API_SECRET", "")
    )


def _init_cloudinary():
    """Initialize Cloudinary config once."""
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def upload_image(file_bytes: bytes, filename: str, folder: str = "chatya/products") -> str:
    """
    Upload an image and return a public URL.
    - If Cloudinary is configured: uploads to Cloudinary CDN.
    - Otherwise: saves locally to /uploads/ folder.
    """
    if _cloudinary_configured():
        _init_cloudinary()
        # Generate a unique public_id
        ext = os.path.splitext(filename)[1].lower()
        public_id = f"{folder}/{uuid.uuid4().hex}"
        
        result = cloudinary.uploader.upload(
            file_bytes,
            public_id=public_id,
            resource_type="image",
            overwrite=True,
            folder=None,  # Already included in public_id
            transformation=[
                {"quality": "auto", "fetch_format": "auto"},
            ],
        )
        return result["secure_url"]
    else:
        # Fallback: save locally
        ext = os.path.splitext(filename)[1].lower()
        local_filename = f"{uuid.uuid4().hex}{ext}"
        upload_dir = settings.UPLOAD_DIR
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, local_filename)
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        return f"/uploads/{local_filename}"


def delete_image(url: str) -> bool:
    """
    Delete an image by URL.
    - If Cloudinary URL: delete from Cloudinary.
    - If local URL: delete from filesystem.
    """
    if _cloudinary_configured() and "res.cloudinary.com" in url:
        _init_cloudinary()
        try:
            # Extract public_id from Cloudinary URL
            # URL format: https://res.cloudinary.com/{cloud}/image/upload/v123/chatya/products/abc123.jpg
            parts = url.split("/upload/")
            if len(parts) == 2:
                path_with_version = parts[1]
                # Remove version prefix (v123456789/)
                if path_with_version.startswith("v"):
                    path_with_version = "/".join(path_with_version.split("/")[1:])
                # Remove extension
                public_id = os.path.splitext(path_with_version)[0]
                cloudinary.uploader.destroy(public_id)
                return True
        except Exception:
            pass
        return False
    else:
        # Local file
        try:
            local_path = os.path.join(settings.UPLOAD_DIR, os.path.basename(url))
            if os.path.exists(local_path):
                os.remove(local_path)
                return True
        except Exception:
            pass
        return False
