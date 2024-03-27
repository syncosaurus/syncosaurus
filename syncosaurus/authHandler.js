const authServerUrl = `http://localhost:1337`;

export const authHandler = async token => {
  try {
    const response = await fetch(`${authServerUrl}/verify?token=${token}`);
    const { protectedHeader, payload } = response.json();

    return { protectedHeader, payload };
  } catch (error) {
    console.error(error);
  }
};

export const getToken = async () => {
  const response = await fetch(`${authServerUrl}/authorize`);
  const token = await response.json();

  return token;
};
