// this is a sample authHandler implmentation that will eventually be removed
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
