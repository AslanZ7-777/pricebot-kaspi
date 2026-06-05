from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    database_url: str = "postgresql+asyncpg://omarket:omarket_secret@localhost:5432/omarket_monitor"

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    # Omarket credentials
    omarket_login: str = ""
    omarket_password: str = ""

    # API security
    api_key: str = "dev_api_key_change_in_production"

    # Browser
    browser_pool_size: int = 3
    browser_headless: bool = True

    # Monitoring
    default_check_interval_minutes: int = 30
    scan_batch_interval_minutes: int = 5
    rate_limit_per_minute: int = 10

    # Logging
    log_level: str = "INFO"

    # Omarket selectors (update without code changes when site redesigns)
    selector_our_price: str = ".my-offer .price-value, .seller-info--active .price-value"
    selector_competitor_block: str = ".offers-list .offer-item, .product-offers .offer"
    selector_competitor_price: str = ".offer-price .price-value, .price"
    selector_competitor_seller: str = ".seller-name, .offer-seller"
    selector_price_input: str = "input[name='price'], #price-input"
    selector_save_button: str = "button[type='submit'].save, .btn-save-price"
    selector_product_name: str = "h1.product-title, .product-name h1"

    @property
    def selector_config(self) -> dict:
        return {
            "our_price": self.selector_our_price,
            "competitor_block": self.selector_competitor_block,
            "competitor_price": self.selector_competitor_price,
            "competitor_seller": self.selector_competitor_seller,
            "price_input": self.selector_price_input,
            "save_button": self.selector_save_button,
            "product_name": self.selector_product_name,
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()
