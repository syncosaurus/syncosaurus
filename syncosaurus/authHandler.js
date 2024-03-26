const authServerUrl = `https://auth-worker.josephliang.workers.dev/`;

export const jwtAuthHandler = async (token) => {
  try {
    const response = await fetch(`${authServerUrl}/verify?token=${token}`);
    const { protectedHeader, payload } = response.json();

    return { protectedHeader, payload };
  } catch (error) {
    console.error(error);
  }
}