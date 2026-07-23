export function bearerToken(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}
