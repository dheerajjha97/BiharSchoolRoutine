
"use client";
import { redirect } from 'next/navigation';

export default function ConfigPage() {
  // Since the config page is now a multi-page layout,
  // we redirect from the base /config route to the first page.
  redirect('/config/general');
}
