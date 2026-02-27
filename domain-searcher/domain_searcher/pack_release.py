import os
import zipfile

def create_release():
    output_filename = "domain_searcher_release.zip"
    exclude_dirs = {'.venv', '__pycache__', '.git', '.idea', '.vscode', '.gemini'}
    # Исключаем файлы которые зависят от среды или содержат креды
    exclude_extensions = {'.db', '.db-journal', '.log', '.zip'}
    exclude_files = {'.env', 'pack_release.py'}
    
    with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('.'):
            # Фильтруем папки
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if file in exclude_files:
                    continue
                
                _, ext = os.path.splitext(file)
                if ext.lower() in exclude_extensions:
                    continue
                
                filepath = os.path.join(root, file)
                arcname = os.path.relpath(filepath, '.')
                zipf.write(filepath, arcname)

    print(f"📦 Release archive successfully created: {output_filename}")

if __name__ == '__main__':
    create_release()
