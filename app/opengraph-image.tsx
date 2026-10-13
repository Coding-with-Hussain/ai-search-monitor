import { renderSocialImage } from "@/components/marketing/social-image";

export const alt = "AI Search Visibility Monitor: Does AI recommend your business?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderSocialImage();
}
