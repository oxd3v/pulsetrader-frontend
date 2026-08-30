'use server';
import { encrypt, decryptFromServer } from "./encryption";


const AUTH_TOKEN_SECURITY_PASSWORD =
  process.env.AUTH_TOKEN_SECURITY_PASSWORD;

const FRONT_END_WALLET_SECURITY = process.env.FRONT_END_WALLET_SECURITY;

export const encryptAuthToken = async (text: string) => {
  if (AUTH_TOKEN_SECURITY_PASSWORD) {
    return encrypt(text, AUTH_TOKEN_SECURITY_PASSWORD);
  }
};


export const decryptPrivateKey = async (secureKey: string) => {
  if (FRONT_END_WALLET_SECURITY) {
    return decryptFromServer(secureKey.toString(), FRONT_END_WALLET_SECURITY);
  }
}
