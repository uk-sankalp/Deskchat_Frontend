export function getApiErrorMessage(error: any, fallback: string): string {
  const responseData = error?.response?.data;

  const rawMessage =
    (typeof responseData === "string" && responseData) ||
    responseData?.message ||
    responseData?.error ||
    error?.message ||
    "";

  const msg = String(rawMessage).toLowerCase();

  if (msg.includes("wrong password")) return "Wrong password.";
  if (msg.includes("locked")) return "Room is locked by host.";
  if (msg.includes("room full")) return "Room is full.";
  if (msg.includes("expired")) return "Room has expired.";
  if (msg.includes("banned")) return "You are temporarily banned from this room.";
  if (msg.includes("no rooms exist") || msg.includes("room not found")) return "Room code not found.";

  return rawMessage ? String(rawMessage) : fallback;
}
