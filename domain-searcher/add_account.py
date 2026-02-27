import os
import argparse
from sqlmodel import Session, select
from core.models import engine, Account

def main():
    parser = argparse.ArgumentParser(description="Утилита для управления аккаунтами в базе данных Domains Searcher.")
    parser.add_argument("username", type=str, help="ID сотрудника / Логин (например: manager_1)")
    parser.add_argument("--password", type=str, default="", help="Пароль от аккаунта (опционально, т.к. вход полу-ручной)")
    parser.add_argument("--email", type=str, default="", help="Email (опционально)")
    
    args = parser.parse_args()
    
    with Session(engine) as session:
        # Проверяем есть ли уже такой
        statement = select(Account).where(Account.username == args.username)
        existing = session.exec(statement).first()
        
        if existing:
            print(f"⚠️ Аккаунт '{args.username}' уже существует в базе! Статус: {existing.status}")
            return
            
        new_account = Account(
            username=args.username,
            password=args.password,
            email=args.email,
            status="active"
        )
        session.add(new_account)
        session.commit()
        print(f"✅ Успешно добавлен аккаунт: '{args.username}'")

if __name__ == "__main__":
    main()
