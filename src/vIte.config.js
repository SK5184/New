                    import { defineConfig } from 'vite'
                    import react from '@vitejs/plugin-react'
                    import path from "path";

                      export default defineConfig({
                      plugins: [react()],
                      resolve: {
                        alias: {
                          "@": path.resolve(__dirname, "./src"),
                            },
                            },
                        server: {
                        host: '0.0.0.0', // Exposes the project to your Local Area Network (LAN)
                        port: 3000,      // Forces Vite to run on port 3000
                        strictPort: true // Prevents Vite from auto-switching to 3001 if 3000 is busy
                      }
                    })                                                                                                                                                                                            