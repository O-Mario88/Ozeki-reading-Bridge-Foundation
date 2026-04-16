import os
import re
import random
import urllib.parse

src_dir = "src"
assets_photos_dir = "assets/photos"

# Get all valid photos from assets/photos
valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
ignored_files = {".DS_Store", "logo.png", "Signature.png"}

photos = []
for f in os.listdir(assets_photos_dir):
    if f not in ignored_files and any(f.lower().endswith(ext) for ext in valid_exts):
        photos.append(f)

if not photos:
    print("No photos found.")
    exit()

random.seed(42)
random.shuffle(photos)
photo_index = 0

def get_next_photo():
    global photo_index
    p = photos[photo_index % len(photos)]
    photo_index += 1
    return p

# Match /photos/ or public/photos/ followed by filename
pattern = re.compile(r'(/photos/|public/photos/)([^"\'\) >]+\.(?:jpg|jpeg|png|webp|JPG|JPEG))')

files_updated = 0

for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith((".ts", ".tsx", ".js", ".jsx")):
            path = os.path.join(root, f)
            with open(path, "r", encoding="utf-8") as file:
                content = file.read()
            
            original_content = content
            
            def replacer(match):
                prefix = match.group(1)
                new_photo = get_next_photo()
                
                # If imported, use exact filename. If URL, encode it.
                if "public/" in prefix:
                    return prefix + new_photo
                else:
                    return prefix + urllib.parse.quote(new_photo)

            new_content = pattern.sub(replacer, content)
            
            if new_content != original_content:
                with open(path, "w", encoding="utf-8") as file:
                    file.write(new_content)
                print(f"Updated {path}")
                files_updated += 1

print(f"Updated {files_updated} files with photos from {assets_photos_dir}.")
