// Base64 Image Service - MongoDB'da rasm saqlash uchun
// Bu yechim juda soddaroq va tez ishlaydi

// Rasmni base64 formatiga aylantirish
export const convertImageToBase64 = async (imageUri: string): Promise<string> => {
  try {
    console.log('Rasmni base64 formatiga aylantirilmoqda:', imageUri);
    
    // Rasmni fetch qilish
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    // Base64'ga aylantirish
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        console.log('Rasm muvaffaqiyatli base64 formatiga aylantirildi');
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Base64 aylantirish xatoligi:', error);
    throw new Error('Rasmni base64 formatiga aylantirishda xatolik yuz berdi');
  }
};

// Rasm yuklash funksiyasi (base64 qaytaradi)
export const uploadImageToBase64 = async (
  imageUri: string,
  folder?: string, // Folder endi kerak emas, lekin backward compatibility uchun
  fileName?: string // FileName endi kerak emas, lekin backward compatibility uchun
): Promise<string> => {
  try {
    console.log('Rasmni base64 formatiga yuklanmoqda:', imageUri);
    
    const base64Image = await convertImageToBase64(imageUri);
    
    console.log('Rasm muvaffaqiyatli base64 formatiga yuklandi');
    return base64Image;
  } catch (error) {
    console.error('Base64 yuklash xatoligi:', error);
    throw new Error('Rasmni base64 formatiga yuklashda xatolik yuz berdi');
  }
};

// Rasm o'chirish funksiyasi (base64 uchun kerak emas, lekin backward compatibility uchun)
export const deleteImageFromBase64 = async (imageUrl: string): Promise<void> => {
  try {
    console.log('Base64 rasm o\'chirish - MongoDB\'da avtomatik o\'chiriladi');
    // Base64 rasmlar MongoDB'da saqlanadi, shuning uchun alohida o'chirish kerak emas
    // MongoDB'dan o'chirilganda rasm ham o'chiriladi
  } catch (error) {
    console.error('Base64 o\'chirish xatoligi:', error);
    throw new Error('Rasmni o\'chirishda xatolik yuz berdi');
  }
};

// Backward compatibility
export const uploadImageToCloudinary = uploadImageToBase64;
export const deleteImageFromCloudinary = deleteImageFromBase64;
export const uploadImageToS3 = uploadImageToBase64;
export const deleteImageFromS3 = deleteImageFromBase64;
