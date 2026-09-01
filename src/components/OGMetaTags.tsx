import { useEffect } from "react";

interface OGMetaTagsProps {
  title: string;
  description?: string;
  image?: string;
}

const OGMetaTags = ({ title, description, image }: OGMetaTagsProps) => {
  useEffect(() => {
    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const setNameMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    document.title = title;
    setMeta("og:title", title);
    setMeta("og:type", "website");
    if (description) {
      setMeta("og:description", description);
      setNameMeta("description", description);
    }
    if (image) {
      setMeta("og:image", image);
      setNameMeta("twitter:image", image);
    }
    setNameMeta("twitter:card", "summary_large_image");

    return () => {
      document.title = "Dokan";
    };
  }, [title, description, image]);

  return null;
};

export default OGMetaTags;
