import os

base_dir = "src/app"

photo_map = {
    "sponsor-a-school/page.tsx": "/photos/Amolatar%20District%20Literacy.jpg",
    "impact/methodology/page.tsx": "/photos/Phonics%20Session%20for%20Teachers%20in%20Namasale%20Sub-County%20Amolatar.jpg",
    "impact/case-studies/page.tsx": "/photos/classroom-learners-writing.jpg",
    "impact/calculator/page.tsx": "/photos/11.jpeg",
    "impact/government/page.tsx": "/photos/14.jpeg",
    "schools/[id]/page.tsx": "/photos/12.jpeg",
    "newsletter/page.tsx": "/photos/22.jpeg",
    "newsletter/[slug]/page.tsx": "/photos/22.jpeg",
    "parishes/[id]/page.tsx": "/photos/PXL_20260218_124653516.MP.jpg",
    "partner/portal/page.tsx": "/photos/24.jpeg",
    "partner/data-room/page.tsx": "/photos/Training%20In%20Agago%20Lukole%20Sub-County.jpg",
    "methodology/page.tsx": "/photos/10.jpeg",
    "sub-counties/[id]/page.tsx": "/photos/Literacy%20Training%20in%20Loro%20-%20Oyam%20District.jpg",
    "districts/[id]/page.tsx": "/photos/Literacy%20Training%20in%20Loro%20-%20Oyam%20District.jpg",
    "regions/[id]/page.tsx": "/photos/Reading%20Session%20in%20Dokolo%20Greater%20Bata%20Cluster.jpeg",
    "sub-regions/[id]/page.tsx": "/photos/Reading%20Session%20in%20Dokolo%20Greater%20Bata%20Cluster.jpeg",
    "anthologies/[slug]/page.tsx": "/photos/classroom-learners-writing.jpg",
    "transparency/page.tsx": "/photos/16.jpeg",
}

fallback_photo = "/photos/17.jpeg"

for root, dirs, files in os.walk(base_dir):
    for f in files:
        if f == "page.tsx":
            path = os.path.join(root, f)
            rel_path = os.path.relpath(path, base_dir)
            
            with open(path, "r") as r:
                content = r.read()
            
            img = photo_map.get(rel_path, fallback_photo)
            
            original_content = content
            
            # Simple string replacements for known patterns
            if 'className="page-hero"' in content and 'backgroundImage' not in content:
                content = content.replace(
                    'className="page-hero"',
                    f'className="page-hero" style={{{{ backgroundImage: "url(\'{img}\')" }}}}'
                )
            elif 'className="page-hero" style={{ paddingBottom: "2rem" }}' in content:
                content = content.replace(
                    'className="page-hero" style={{ paddingBottom: "2rem" }}',
                    f'className="page-hero" style={{{{ paddingBottom: "2rem", backgroundImage: "url(\'{img}\')" }}}}'
                )

            # Specifically for transparency
            if rel_path == "transparency/page.tsx":
                if 'className="section donor-trust-hero"' in content and 'backgroundImage' not in content:
                    content = content.replace(
                        'className="section donor-trust-hero"',
                        'className="section donor-trust-hero" style={{ backgroundImage: "url(\'/photos/16.jpeg\')", backgroundSize: "cover", backgroundPosition: "center", position: "relative" }}'
                    )
            
            if content != original_content:
                with open(path, "w") as w:
                    w.write(content)
                print(f"Updated {rel_path} with {img}")
