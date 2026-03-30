const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Find all page.tsx files excluding the portal/dashboard
const files = glob.sync("src/app/**/page.tsx", { ignore: ["src/app/impact/dashboard/**"] });

let updatedFilesCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  let originalContent = content;

  // 1. Upgrade SectionWrapper themes (off-white and light -> charius-beige)
  content = content.replace(/<SectionWrapper[^>]*theme="off-white"[^>]*>/g, (match) => match.replace('theme="off-white"', 'theme="charius-beige"'));
  content = content.replace(/<SectionWrapper[^>]*theme="light"[^>]*>/g, (match) => match.replace('theme="light"', 'theme="charius-beige"'));
  content = content.replace(/<SectionWrapper[^>]*theme=\{"light"\}[^>]*>/g, (match) => match.replace('theme={"light"}', 'theme="charius-beige"'));
  content = content.replace(/<SectionWrapper[^>]*theme=\{"off-white"\}[^>]*>/g, (match) => match.replace('theme={"off-white"}', 'theme="charius-beige"'));

  // 2. Upgrade PremiumCard to have variant="charius"
  // If a PremiumCard does NOT have a variant already, inject variant="charius"
  content = content.replace(/<PremiumCard(?!\s+[^>]*variant=)[^>]*>/g, (match) => {
    return match.replace("<PremiumCard", '<PremiumCard variant="charius"');
  });

  // 3. Upgrade CTAStrip theme
  content = content.replace(/<CTAStrip([^>]+)theme="brand"([^>]*)>/g, '<CTAStrip$1theme="charius"$2>');
  content = content.replace(/<CTAStrip([^>]+)theme=\{"brand"\}([^>]*)>/g, '<CTAStrip$1theme="charius"$2>');
  content = content.replace(/<CTAStrip([^>]+)theme="light"([^>]*)>/g, '<CTAStrip$1theme="charius"$2>');

  // 4. Update core text colors manually injected in the legacy layouts
  content = content.replace(/className="([^"]*)text-brand-primary([^"]*)"/g, (match, prefix, suffix) => {
    if (match.includes("font-bold") && (match.includes("text-2xl") || match.includes("text-3xl") || match.includes("text-4xl"))) {
      return `className="${prefix}text-[#111]${suffix}"`;
    }
    return match;
  });

  // Convert generic text-gray-600 to text-gray-500 for better Charius contrast
  content = content.replace(/className="([^"]*)text-gray-600([^"]*)"/g, `className="$1text-gray-500$2"`);

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated: ${file}`);
    updatedFilesCount++;
  }
}

console.log(`\nSuccessfully applied Charius tokens to ${updatedFilesCount} pages.`);
