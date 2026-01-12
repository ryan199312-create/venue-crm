import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})
```

### 步驟 3：在本地重整依賴
為了產生正確的鎖定檔 (`package-lock.json`) 上傳給 Vercel，請在終端機執行：

1.  **刪除舊的鎖定檔**：
    ```bash
    rm -rf node_modules package-lock.json
    ```
2.  **重新安裝 (依照新的 package.json)**：
    ```bash
    npm install
    ```

### 步驟 4：推送更新到 GitHub
這會觸發 Vercel 自動重新部署。

在終端機執行：
```bash
git add .
git commit -m "Fix dependencies for Vercel"
git push