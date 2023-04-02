import { useEffect, useRef } from "react";

export default (event, handler, element) => {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const target = element || window;
    const listener = event => savedHandler.current(event);

    target.addEventListener(event, listener);

    return () => {
      target.removeEventListener(event, listener);
    };
  }, [event, element]);
};
