import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../core/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const useFileUpload = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const uploadFile = async (file, path = 'receipts') => {
    if (!user) throw new Error("Not logged in");
    const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const uploadMultipleImages = async (files, fieldName, setFormData) => {
    if (!user || !files || files.length === 0) return;

    addToast(`正在上傳 ${files.length} 張圖片... (Uploading...)`, "info");
    const newUrls = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const storageRef = ref(storage, `images/${Date.now()}_${file.name}`);
      try {
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newUrls.push(url);
      } catch (e) {
        addToast(`上傳 ${file.name} 失敗`, "error");
      }
    }

    if (newUrls.length > 0) {
      setFormData(prev => ({
        ...prev,
        [fieldName]: [...(prev[fieldName] || []), ...newUrls]
      }));
      addToast("圖片上傳完成！", "success");
    }
    return newUrls;
  };

  return { uploadFile, uploadMultipleImages };
};
