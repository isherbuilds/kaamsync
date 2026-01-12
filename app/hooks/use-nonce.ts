import { createContext, useContext } from "react";

export const NonceContext = createContext<string>("");

export const NonceProvider = NonceContext.Provider;

export function useNonce() {
	return useContext(NonceContext);
}
