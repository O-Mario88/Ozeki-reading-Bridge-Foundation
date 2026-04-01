import { permanentRedirect } from "next/navigation";

export default function DonateRedirectPage() {
  permanentRedirect("/partner-with-us");
}
