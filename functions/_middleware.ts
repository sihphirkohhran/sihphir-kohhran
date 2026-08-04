type Context = {
  request: Request;
  next: () => Promise<Response>;
};

const APEX_HOST = 'sihphirpresbyteriankohhran.org';
const WWW_HOST = `www.${APEX_HOST}`;

export const onRequest = async ({ request, next }: Context): Promise<Response> => {
  const url = new URL(request.url);
  if (url.hostname.toLowerCase() === WWW_HOST) {
    url.protocol = 'https:';
    url.hostname = APEX_HOST;
    return Response.redirect(url.toString(), 301);
  }
  return next();
};
