#!/bin/sh
set -eu

: "${BUCKET_NAME:?BUCKET_NAME is required}"
: "${CDN_DOMAIN:?Set CDN_DOMAIN to the actual CDN hostname}"
: "${LOCAL_DIST_PATH:=dist}"

case "$CDN_DOMAIN" in
  *[!a-zA-Z0-9.-]*|.*|*.)
    echo 'CDN_DOMAIN must be a hostname without protocol or path' >&2
    exit 1
    ;;
esac
test -f "$LOCAL_DIST_PATH/index.html"

# 先上传资源；保留旧版本文件，避免已打开的页面加载旧资源时出现 404。
coscli sync "$LOCAL_DIST_PATH/" "cos://$BUCKET_NAME/" --recursive --force --exclude '(^|/)index\.html$'
# 资源全部成功后再切换入口，随后提交 CDN 缓存刷新任务。
coscli cp "$LOCAL_DIST_PATH/index.html" "cos://$BUCKET_NAME/index.html" --force
tccli cdn PurgePathCache --cli-unfold-argument --Paths "https://$CDN_DOMAIN/" --FlushType delete
