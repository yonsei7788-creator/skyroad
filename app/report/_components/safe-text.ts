/**
 * AI가 string 필드에 object를 반환하는 경우를 방어합니다.
 * React child로 렌더링할 때 object가 직접 전달되면 에러가 발생하므로,
 * object인 경우 JSON values를 join하여 문자열로 변환합니다.
 */
export const safeText = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) return value.map(safeText).join(", ");
  if (typeof value === "object") {
    return Object.values(value).map(safeText).join(" ");
  }
  return String(value);
};
