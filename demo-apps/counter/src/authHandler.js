const authServerUrl = import.meta.env.VITE_AUTH_SERVER_URL || `http://localhost:1337`;

export const authHandler = async token => {
  try {
    const response = await fetch(`${authServerUrl}/verify?token=${token}`);
    const { payload } = response.json();

    return !!(payload);
  } catch (error) {
    console.error(error);
  }
};

export const getToken = async () => {
  const response = await fetch(`${authServerUrl}/authorize`);
  const token = await response.json();

  console.log(token);

  return token;
};
