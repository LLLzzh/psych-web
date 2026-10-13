#!/bin/sh
set -eu

: "${FE_COS_ACCESS_KEY:?FE_COS_ACCESS_KEY is required}"
: "${FE_COS_SECRET_KEY:?FE_COS_SECRET_KEY is required}"
: "${BUCKET_NAME:?Set the COS bucket for this environment}"
: "${COS_REGION:?Set the COS region for this environment}"
: "${CDN_DOMAIN:?Set the CDN hostname for this environment}"
: "${LOCAL_DIST_PATH:=dist}"
test -f "$LOCAL_DIST_PATH/index.html"

# 正式发布不得使用已确认的测试资源。
if [ "${CI_ENVIRONMENT_NAME:-}" = production ]; then
  if [ "$BUCKET_NAME" = "${COS_TEST_BUCKET:-psych-new-1308722423}" ] ||
     [ "$CDN_DOMAIN" = "${CDN_TEST_DOMAIN:-psych-user.xhpolaris.com}" ]; then
    echo 'Production must use its own COS bucket and CDN hostname' >&2
    exit 1
  fi
fi

case "$BUCKET_NAME:$COS_REGION" in
  *[!a-zA-Z0-9:-]*)
    echo 'Invalid COS bucket or region' >&2
    exit 1
    ;;
esac

umask 077
mkdir -p "$HOME/.tccli"
cat > "$HOME/.cos.yaml" <<EOF
cos:
  base:
    secretid: "$FE_COS_ACCESS_KEY"
    secretkey: "$FE_COS_SECRET_KEY"
    sessiontoken: ""
    protocol: https
    mode: SecretKey
    cvmrolename: ""
    closeautoswitchhost: ""
    disableencryption: "true"
  buckets:
    - name: "$BUCKET_NAME"
      alias: "$BUCKET_NAME"
      region: "$COS_REGION"
      endpoint: "cos.$COS_REGION.myqcloud.com"
      ofs: false
EOF
cat > "$HOME/.tccli/default.credential" <<EOF
{
  "secretId": "$FE_COS_ACCESS_KEY",
  "secretKey": "$FE_COS_SECRET_KEY"
}
EOF
