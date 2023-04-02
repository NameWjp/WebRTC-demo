import React from 'react';
import { List, Button } from 'antd';

const UserList = props => {
  const { onlineUser, socket, handleInteract } = props;

  return (
    <List
      locale={{ emptyText: "暂无用户" }}
      bordered
      dataSource={onlineUser}
      renderItem={(item) => (
        <List.Item>
          { item.username }
          {socket.id !== item.userId && (
            <Button type="link" onClick={() => handleInteract?.(item.userId)}>
              互动
            </Button>
          )}
        </List.Item>
      )}
    />
  );
};

export default UserList;
