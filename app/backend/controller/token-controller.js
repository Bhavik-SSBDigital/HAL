const refreshAccessToken = async (req, res) => {
    const { refreshToken } = req.body;
  
    try {
      // Verify the refresh token
      const decodedRefreshToken = jwt.verify(refreshToken, process.env.REFRESH_SECRET_KEY);
  
      // Check if the refresh token exists in the database (or any other storage mechanism)
      const existingToken = await Token.findOne({ token: refreshToken });
  
      if (!existingToken) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }
  
      // Generate a new access token
      const newAccessToken = jwt.sign(
        decodedRefreshToken, // You can include user claims from the decoded refresh token
        process.env.SECRET_ACCESS_KEY,
        { expiresIn: '365d' } // Shorter expiration for access token
      );
  
      return res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };