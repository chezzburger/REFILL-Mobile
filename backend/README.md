# Django Backend - Refill Web

Full-stack Django REST Framework backend with MySQL support and CORS configuration for React frontend.

## Project Structure

```
backend/
├── config/                          # Django project configuration
│   ├── settings.py                 # Main settings with DB & CORS config
│   ├── urls.py                     # URL routing
│   ├── wsgi.py                     # WSGI application
│   └── __init__.py
├── apps/                            # Modular Django applications
│   ├── users/                       # User management app
│   │   ├── models.py               # User profile model
│   │   ├── serializers.py          # DRF serializers
│   │   ├── views.py                # ViewSets for users
│   │   ├── urls.py                 # App-specific URLs
│   │   ├── admin.py                # Django admin
│   │   ├── apps.py                 # App config
│   │   └── __init__.py
│   ├── products/                    # Products app
│   │   ├── models.py               # Product & Category models
│   │   ├── serializers.py          # Product serializers
│   │   ├── views.py                # Product ViewSets
│   │   ├── urls.py                 # App URLs
│   │   ├── admin.py                # Django admin
│   │   ├── apps.py                 # App config
│   │   └── __init__.py
│   ├── orders/                      # Orders app
│   │   ├── models.py               # Order & OrderItem models
│   │   ├── serializers.py          # Order serializers
│   │   ├── views.py                # Order ViewSets
│   │   ├── urls.py                 # App URLs
│   │   ├── admin.py                # Django admin
│   │   ├── apps.py                 # App config
│   │   └── __init__.py
│   └── __init__.py
├── manage.py                        # Django management script
├── requirements.txt                 # Python dependencies
├── .env.example                     # Environment variables template
└── README.md                        # This file
```

## Setup Instructions

### 1. Prerequisites

- Python 3.8+
- MySQL Server (XAMPP running on localhost:3306)
- Virtual Environment

### 2. Clone & Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Database Setup

#### Create MySQL Database

```sql
CREATE DATABASE refill_web CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### Or use Django shell:

```bash
python manage.py dbshell
```

Then run:

```sql
CREATE DATABASE refill_web CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Django Configuration

1. **Copy .env file:**

```bash
cp .env.example .env
```

2. **Update .env if needed** (defaults work with XAMPP):

```
DB_NAME=refill_web
DB_USER=root
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=3306
```

### 5. Run Migrations

```bash
# Create migrations for all apps (already included)
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### 6. Start Development Server

```bash
python manage.py runserver
```

Server runs on: `http://localhost:8000`

Admin panel: `http://localhost:8000/admin`

## Database Configuration (settings.py)

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'refill_web',
        'USER': 'root',
        'PASSWORD': '',
        'HOST': 'localhost',
        'PORT': '3306',
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'"
        }
    }
}
```

## CORS Configuration (settings.py)

### Allowed Origins:

```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',    # Vite default
    'http://localhost:3000',    # React dev server
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
]
```

### CSRF Settings:

```python
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
]

CSRF_COOKIE_HTTPONLY = False  # Allow JavaScript to access CSRF token
CSRF_COOKIE_SAMESITE = 'Lax'
```

## Middleware Order

The CORS middleware is positioned **before** Django's CommonMiddleware:

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # CORS before CommonMiddleware!
    'django.middleware.common.CommonMiddleware',
    # ... other middleware
]
```

## API Endpoints

### Users App (`/api/auth/`)

- `GET/POST /api/auth/users/` - User list/create
- `GET /api/auth/users/me/` - Current user
- `GET/POST /api/auth/profiles/` - User profiles
- `GET /api/auth/profiles/my_profile/` - Current user's profile

### Products App (`/api/products/`)

- `GET/POST /api/products/` - Products list
- `GET/POST /api/products/categories/` - Categories
- `GET /api/products/{id}/` - Product detail

### Orders App (`/api/orders/`)

- `GET/POST /api/orders/` - Orders list/create
- `GET /api/orders/{id}/` - Order detail
- `PATCH /api/orders/{id}/` - Update order status

## Authentication

- Uses Django's built-in Session Authentication
- Login endpoint: `/api-auth/login/`
- Logout endpoint: `/api-auth/logout/`

## Production Deployment Notes

Before deploying to production:

1. **Set DEBUG = False** in settings.py
2. **Generate secure SECRET_KEY**
3. **Set CSRF_COOKIE_SECURE = True** (requires HTTPS)
4. **Set SESSION_COOKIE_SECURE = True** (requires HTTPS)
5. **Update ALLOWED_HOSTS** with your domain
6. **Update CORS_ALLOWED_ORIGINS** with frontend domain
7. **Use environment variables** for sensitive data
8. **Configure static/media storage** (S3, Cloud Storage, etc.)
9. **Use a production database** (not local)
10. **Use a production WSGI server** (Gunicorn, uWSGI)

## Troubleshooting

### MySQL Connection Error

```
Error: (2002, "Can't connect to MySQL server on 'localhost' (10061)")
```

**Solution:** Ensure XAMPP MySQL is running.

### CORS Error in Browser

```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:** Check `CORS_ALLOWED_ORIGINS` in settings.py matches your frontend URL.

### CSRF Token Error

```
CSRF token missing or incorrect
```

**Solution:** Ensure frontend includes `X-CSRFToken` header with requests.

## Dependencies

- **Django** - Web framework
- **djangorestframework** - REST API framework
- **django-cors-headers** - CORS support
- **mysqlclient** - MySQL Python driver
- **python-decouple** - Environment variables

## License

MIT
