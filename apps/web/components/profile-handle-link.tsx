import Link from "next/link";

type ProfileHandleLinkProps = {
  handle: string;
  className?: string;
  showAt?: boolean;
};

export function ProfileHandleLink({
  handle,
  className = "profile-handle-link",
  showAt = true
}: ProfileHandleLinkProps) {
  return (
    <Link className={className} href={`/profiles/${encodeURIComponent(handle)}`}>
      {showAt ? "@" : ""}
      {handle}
    </Link>
  );
}
