import { Alert, Button, Space } from 'antd'

type ApiUnavailableProps = {
  title?: string
  onRetry?: () => void
}

export function ApiUnavailable({ title = '当前页面接口暂不可用', onRetry }: ApiUnavailableProps) {
  return (
    <Alert
      showIcon
      type="warning"
      message={title}
      description={
        <Space direction="vertical" size={8}>
          <span>暂时无法加载数据，请稍后重试。</span>
          {onRetry ? <Button onClick={onRetry}>重试</Button> : null}
        </Space>
      }
    />
  )
}
