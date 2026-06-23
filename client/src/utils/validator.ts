export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  // 8-20位，需包含字母和数字
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/;
  return passwordRegex.test(password);
};

export const validateNickname = (nickname: string): boolean => {
  // 2-20个字符
  return nickname.length >= 2 && nickname.length <= 20;
};
