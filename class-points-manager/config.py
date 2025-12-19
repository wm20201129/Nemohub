import os
import sys

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here-change-in-production'
    
    # 确定程序运行的基础路径
    if getattr(sys, 'frozen', False):
        # 如果是打包后的 EXE 运行，基础路径是 EXE 所在目录
        BASE_DIR = os.path.dirname(sys.executable)
    else:
        # 如果是源码运行，基础路径是当前文件所在目录
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))

    # 数据库存放在 BASE_DIR/data 目录下
    DATABASE_PATH = os.path.join(BASE_DIR, 'data', 'class_points.db')
    
    # 上传文件存放在 BASE_DIR/static/uploads 目录下
    # 优先使用外部 static 目录（如果存在），否则使用内部打包的
    EXTERNAL_STATIC = os.path.join(BASE_DIR, 'static')
    if os.path.exists(EXTERNAL_STATIC) and getattr(sys, 'frozen', False):
        UPLOAD_FOLDER = os.path.join(EXTERNAL_STATIC, 'uploads')
    else:
        # 开发环境或无外部目录
        UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'uploads')

    DEBUG = False