import { renderSocialImage } from "@/components/marketing/social-image";

// Same card as the Open Graph image. Config exports are declared here (not
// re-exported) because Next reads them statically from this file.
export const alt = "AI Search Visibility Monitor: Does AI recommend your business?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return renderSocialImage();
}
