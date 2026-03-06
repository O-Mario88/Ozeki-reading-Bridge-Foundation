export function readApiKey(request: Request) {
    const auth = request.headers.get("authorization") ?? "";
    const keyHeader = request.headers.get("x-partner-key") ?? "";

    if (keyHeader.trim()) {
        return keyHeader.trim();
    }
    if (auth.toLowerCase().startsWith("bearer ")) {
        return auth.slice(7).trim();
    }
    return "";
}
