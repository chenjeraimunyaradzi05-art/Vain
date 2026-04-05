export function useSession() {
  return {
    user: null as null | {
      id?: string;
      email?: string;
      name?: string;
      userType?: string;
      photoUrl?: string;
    },
    token: null as string | null,
    isAuthenticated: false,
    isLoading: false,
    biometricEnabled: false,
    biometricAvailable: false,
    logout: async () => {},
    updateUser: () => {},
    toggleBiometric: async () => {},
  };
}
