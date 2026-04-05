import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

export default function SignUpRedirectPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const qs = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams || {})) {
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v != null) qs.append(key, v);
      }
      continue;
    }
    if (value != null) qs.set(key, value);
  }

  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  redirect(`/signup${suffix}`);
}
