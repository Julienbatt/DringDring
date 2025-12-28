from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SUPABASE_JWT_SECRET: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    API_V1_STR: str = "/api/v1"

    class Config:
        env_file = ".env"

settings = Settings()
