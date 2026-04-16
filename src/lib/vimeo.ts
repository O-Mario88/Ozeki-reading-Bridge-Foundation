export function getVimeoToken() {
  return process.env.VIMEO_ACCESS_TOKEN?.trim() || null;
}

export async function uploadVideoToVimeoByPull(
  title: string,
  description: string,
  downloadLink: string
): Promise<{ videoId: string; embedUrl: string }> {
  const token = getVimeoToken();
  if (!token) throw new Error("VIMEO_ACCESS_TOKEN is not configured.");

  const response = await fetch("https://api.vimeo.com/me/videos", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
    body: JSON.stringify({
      upload: {
        approach: "pull",
        link: downloadLink,
      },
      name: title,
      description: description || "OzekiRead Live Lesson Recording",
      privacy: {
        view: "disable", // Only embeddable
        embed: "whitelist",
      },
      embed: {
        buttons: {
          like: false,
          watchlater: false,
          share: false,
        },
        title: {
          name: "hide",
          owner: "hide",
          portrait: "hide",
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[vimeo] Pull upload request failed:`, text);
    throw new Error(`Failed to upload to Vimeo: ${response.statusText}`);
  }

  const data = await response.json();
  // data.uri is usually like "/videos/987654321"
  const videoId = data.uri.split("/").pop();
  return {
    videoId,
    embedUrl: data.player_embed_url || `https://player.vimeo.com/video/${videoId}`,
  };
}

export async function getVimeoVideoTranscodeStatus(videoId: string) {
  const token = getVimeoToken();
  if (!token) throw new Error("VIMEO_ACCESS_TOKEN is not configured.");

  const response = await fetch(`https://api.vimeo.com/videos/${videoId}`, {
    method: "GET",
    headers: {
      Authorization: `bearer ${token}`,
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to check video status: ${response.statusText}`);
  }

  const data = await response.json();

  let thumbnail = null;
  if (data.pictures?.sizes && data.pictures.sizes.length > 0) {
    // Get the highest resolution thumbnail commonly
    thumbnail = data.pictures.sizes[data.pictures.sizes.length - 1].link;
  }

  return {
    status: data.status, // "available", "uploading", "transcoding", "error"
    transcode_status: data.transcode?.status, // "complete", "in_progress", "error"
    duration: data.duration, // integer seconds
    thumbnail_url: thumbnail,
  };
}
