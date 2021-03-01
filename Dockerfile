FROM nginx:alpine
COPY ./viewer/rbm-viewer/dist/rbm-viewer /usr/share/nginx/html/
COPY ./docker/nginx/default.conf /etc/nginx/conf.d/
CMD sed -i -e 's/$PORT/'"$PORT"'/g' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'
