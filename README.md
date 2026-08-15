# Kredi & Fatura Takip

Basit, tek dosyalık (JSON) self-hosted kredi ve fatura takip uygulaması.
Krediler için taksit/faiz girip amortisman planı; faturalar için aylık ödendi/ödenmedi takibi.

## Kurulum (tek komut)

```
git clone <bu-repo-url> && cd kredi-takip && docker compose up -d --build
```

Uygulama http://sunucu-ip:9997 üzerinden açılır.

## Dil

Sağ üstteki buton ile TR/EN arası geçiş yapılır. Metinleri değiştirmek için `lang.js` dosyasını düzenle.

## Veri

`data/db.json` dosyasında saklanır, volume ile kalıcıdır.
