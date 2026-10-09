import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Checkbox, Form, Input, Radio, Select, message } from 'antd'
import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Check,
  HeartHandshake,
  Home,
  Info,
  MessageCircle,
  PawPrint,
  Phone,
  School,
  Sprout,
  Users,
} from 'lucide-react'

import { normalizeCats } from '@/api/adapters/cats'
import { createAdoption } from '@/api/endpoints/adoptions'
import { getCats } from '@/api/endpoints/cats'
import { usePageTitle } from '@/hooks/usePageTitle'
import './mobile.css'

type AdoptionForm = {
  catId: string
  housing: string
  experience: string
  plan: string
  phone: string
  wechat: string
  agree: boolean
}

type CatOption = {
  id: string
  name: string
  avatar: string
  isNeutered: boolean
  status: string
}

const housingOptions = [
  { value: 'OWN_HOUSE', label: '自有住房', icon: Home },
  { value: 'RENT_WHOLE', label: '整租', icon: Building2 },
  { value: 'RENT_SHARE', label: '合租', icon: Building2 },
  { value: 'DORM', label: '校内宿舍', icon: School },
  { value: 'WITH_PARENT', label: '与父母同住', icon: Users },
]

const experienceOptions = [
  { value: 'NEWBIE', label: '新手', icon: Sprout },
  { value: 'EXPERIENCED', label: '有经验', icon: PawPrint },
  { value: 'MULTI_CAT', label: '多猫家庭', icon: HeartHandshake },
]

function normalizeCatOptions(payload: unknown): CatOption[] {
  return normalizeCats(payload).map((cat) => ({
    id: cat.id,
    name: cat.name,
    avatar: cat.avatar,
    isNeutered: cat.isNeutered,
    status: cat.status,
  }))
}

function isAdoptableStatus(status: string): boolean {
  return status === '在校' || status === '住院'
}

export function MobileLayout() {
  usePageTitle('申请领养')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form] = Form.useForm<AdoptionForm>()
  const housing = Form.useWatch('housing', form)
  const experience = Form.useWatch('experience', form)

  const catsQuery = useQuery({ queryKey: ['cats', 'adopt-apply'], queryFn: () => getCats({ page: 1, pageSize: 100 }) })
  const allCatOptions = useMemo(() => normalizeCatOptions(catsQuery.data?.data), [catsQuery.data?.data])
  const catOptions = useMemo(() => {
    return allCatOptions.filter((item) => isAdoptableStatus(item.status))
  }, [allCatOptions])

  useEffect(() => {
    if (catOptions.length === 0) return
    const routeCatId = searchParams.get('catId')?.trim()
    const targetCatId = routeCatId && catOptions.some((item) => item.id === routeCatId) ? routeCatId : catOptions[0]?.id
    if (!targetCatId) return
    if (form.getFieldValue('catId') !== targetCatId) {
      form.setFieldValue('catId', targetCatId)
    }
  }, [catOptions, form, searchParams])

  const mutation = useMutation({
    mutationFn: (payload: AdoptionForm) =>
      createAdoption({
        catId: payload.catId,
        info: {
          housing: payload.housing,
          experience: payload.experience,
          plan: payload.plan,
        },
        contact: {
          phone: payload.phone,
          wechat: payload.wechat,
        },
      }),
    onSuccess: () => message.success('提交成功，请等待协会审核'),
    onError: (error) => message.error(error instanceof Error ? error.message : '提交失败'),
  })

  return (
    <div className="adoption-mobile">
      <header className="adoption-mobile__header">
        <button aria-label="返回上一页" className="adoption-mobile__back" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </button>
        <div className="adoption-mobile__brand">
          <HeartHandshake size={19} />
          <div>
            <span>ADOPTION APPLICATION</span>
            <h1>申请领养</h1>
          </div>
        </div>
        <div className="adoption-mobile__intro">确认你能提供稳定照顾后，提交一份完整的领养申请。</div>
        <div className="adoption-mobile__steps">
          {['填写资料', '协会审核', '线下面谈', '接猫回家'].map((label, index) => (
            <div className={index === 0 ? 'is-active' : ''} key={label}>
              <b>{index + 1}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </header>
      <main className="adoption-mobile__content">
        <div className="adoption-mobile__notice">
          <Info size={17} />
          <span>学生宿舍严禁饲养宠物，请确保您有校外稳定住所。</span>
        </div>
        <Form
          form={form}
          initialValues={{ catId: '', wechat: '' }}
          layout="vertical"
          onFinish={(values) => mutation.mutate(values as AdoptionForm)}
        >
          <section className="adoption-mobile__section">
            <div className="adoption-mobile__section-title">
              <PawPrint size={17} />
              <h2>选择领养对象</h2>
            </div>
            <Form.Item name="catId" rules={[{ required: true, message: '请选择申请猫咪' }]}>
              <Select
                className="adoption-mobile__cat-select"
                loading={catsQuery.isLoading}
                notFoundContent={catsQuery.error ? '猫咪列表加载失败' : '暂无可申请猫咪'}
                options={catOptions.map((item) => ({
                  value: item.id,
                  label: (
                    <span className="adoption-mobile__cat-option">
                      <img alt="" src={item.avatar} />
                      <strong>{item.name}</strong>
                      <em>{item.isNeutered ? '已绝育' : '未绝育'}</em>
                    </span>
                  ),
                }))}
                placeholder="请选择申请猫咪"
              />
            </Form.Item>
          </section>
          <section className="adoption-mobile__section">
            <div className="adoption-mobile__section-title">
              <Home size={17} />
              <h2>居住与养猫经验</h2>
            </div>
            <Form.Item label="目前的居住情况" name="housing" rules={[{ required: true, message: '请选择居住情况' }]}>
              <Radio.Group className="adoption-mobile__choice-grid adoption-mobile__choice-grid--housing">
                {housingOptions.map((item) => {
                  const Icon = item.icon
                  return (
                    <Radio.Button key={item.value} value={item.value}>
                      <Icon size={19} />
                      <span>{item.label}</span>
                      {housing === item.value && <Check size={15} />}
                    </Radio.Button>
                  )
                })}
              </Radio.Group>
            </Form.Item>
            <Form.Item label="养猫经验" name="experience" rules={[{ required: true, message: '请选择养猫经验' }]}>
              <Radio.Group className="adoption-mobile__choice-grid adoption-mobile__choice-grid--experience">
                {experienceOptions.map((item) => {
                  const Icon = item.icon
                  return (
                    <Radio.Button key={item.value} value={item.value}>
                      <Icon size={18} />
                      <span>{item.label}</span>
                      {experience === item.value && <Check size={14} />}
                    </Radio.Button>
                  )
                })}
              </Radio.Group>
            </Form.Item>
          </section>
          <section className="adoption-mobile__section">
            <div className="adoption-mobile__section-title">
              <MessageCircle size={17} />
              <h2>联系与照顾计划</h2>
            </div>
            <Form.Item label="申请理由与喂养计划" name="plan" rules={[{ required: true, message: '请填写申请理由' }]}>
              <Input.TextArea placeholder="请简述经济状况、封窗计划以及对猫咪长期照顾的安排" rows={5} />
            </Form.Item>
            <div className="adoption-mobile__contact-grid">
              <Form.Item label="手机号" name="phone" rules={[{ required: true, message: '请填写手机号' }]}>
                <Input inputMode="tel" prefix={<Phone size={16} />} placeholder="方便协会负责人联系您" />
              </Form.Item>
              <Form.Item label="微信号" name="wechat" rules={[{ required: true, message: '请填写微信号' }]}>
                <Input prefix={<MessageCircle size={16} />} placeholder="用于进一步联系" />
              </Form.Item>
            </div>
          </section>
          <section className="adoption-mobile__submit">
            <Form.Item
              name="agree"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, value) =>
                    value ? Promise.resolve() : Promise.reject(new Error('请先阅读并同意协议')),
                },
              ]}
            >
              <Checkbox>
                我已阅读并同意《山大猫协领养协议》，承诺科学喂养、适龄绝育、有病就医，接受定期回访，绝不遗弃。
              </Checkbox>
            </Form.Item>
            <Button block htmlType="submit" loading={mutation.isPending} type="primary">
              <HeartHandshake size={17} />
              提交领养申请
            </Button>
          </section>
        </Form>
      </main>
    </div>
  )
}
