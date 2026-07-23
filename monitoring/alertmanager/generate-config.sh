#!/bin/sh

set -e

envsubst \
  < /etc/alertmanager/alertmanager.yml.template \
  > /etc/alertmanager/alertmanager.yml

exec /bin/alertmanager \
  --config.file=/etc/alertmanager/alertmanager.yml