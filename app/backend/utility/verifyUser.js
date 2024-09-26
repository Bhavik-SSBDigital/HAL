import jwt from 'jsonwebtoken';

export const verifyUser = async(accessToken) => {
    try{
        const decodedData = jwt.verify(accessToken, process.env.SECRET_ACCESS_KEY);
        return decodedData;
    }catch(error){
        console.log('error', error);
        return "Unauthorized"
    }
}