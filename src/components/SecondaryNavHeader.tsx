"use client";

import {
  Link,
  usePathname,
  useSegmentParams,
  useSelectedLayoutSegments,
} from "@timber-js/app/client";

const pages = {
  sonos: {
    prefix: "ON",
    title: "SONOS",
  },
  app: {
    prefix: "ON THE",
    title: "GO",
  },
  today: {
    prefix: "TO",
    title: "TODAY IN HISTORY",
  },
  "recently-played": {
    prefix: "WITH",
    title: "OTHERS",
  },
  chat: {
    prefix: "WITH",
    title: "US",
  },
  about: {
    prefix: "TO",
    title: "OUR LIFE STORY",
  },
  blog: {
    prefix: "TO",
    title: "OUR BLOG",
  },
};

interface Props {
  artistName?: string;
}

const bandsWithThe = [
  "duo",
  "bernie-worrell",
  "disco-biscuits",
  "drive-by-truckers",
  "g-nome",
  "grateful-dead",
  "jazz-mandolin-project",
  "phish",
  "sci",
  "smashing-pumpkins",
  "steve-kimock-band",
  "stringdusters",
  "tedeschi-trucks",
];

export default function SecondaryNavBar({ artistName }: Props) {
  const pathname = usePathname();
  const { artistSlug } = useSegmentParams() as { artistSlug?: string };
  const segments = useSelectedLayoutSegments();

  const pageMetadata = pages[segments[0]];

  if (pageMetadata) {
    return (
      <>
        <span className="to">{pageMetadata.prefix}</span>
        <Link href={pathname}>{pageMetadata.title}</Link>
      </>
    );
  }

  if (typeof artistSlug === "string") {
    if (!artistName) return null;
    return (
      <>
        <span>TO</span>
        <Link href={`/${artistSlug}`} className="uppercase">
          {bandsWithThe.includes(artistSlug) ? "THE " : ""}
          {artistName}
        </Link>
      </>
    );
  }

  return null;
}
