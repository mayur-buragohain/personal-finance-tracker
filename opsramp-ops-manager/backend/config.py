from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    opsramp_api_endpoint: str = "https://api.opsramp.com"
    opsramp_key: str = ""
    opsramp_secret: str = ""
    opsramp_tenant_id: str = ""
    opsramp_mock: bool = False

    app_admin_username: str = "admin"
    app_admin_password: str = "changeme"
    app_secret_key: str = "dev-secret-change-in-production"
    audit_db_path: str = "audit.db"


settings = Settings()
