# ReWorth mobile Maestro stubs
#
# Install: https://maestro.mobile.dev
# Run against a device/sim with Expo (`ng.reworth.mobile` or Expo Go appId override).
#
# Env:
#   OTP_CODE   — from mock `debugCode` or Termii SMS/WhatsApp
#
# Flows:
#   00_demo_60s.yaml         — ≤60s Home → PDP → Chats (record for PO)
#   01_register_list.yaml    — phone OTP + Sell mock photos + Analyze
#   02_search_chat_offer.yaml
#   03_buy_flow.yaml
#   04_dispute.yaml
#   05_boost_listing.yaml
#
# Example:
#   maestro test -e OTP_CODE=123456 e2e/mobile/01_register_list.yaml
#   maestro test e2e/mobile/00_demo_60s.yaml
#
# Real-device ≤60s screen recording is still a manual PO step after 00_demo_60s passes.
