import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './Brand.css'

function Brand({
  className = '',
  fullName = false,
  inverse = false,
  to = '/',
}) {
  const { t } = useTranslation('common')
  const name = t(fullName ? 'brand.fullName' : 'brand.name')
  const classes = ['brand', inverse ? 'brand--inverse' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <Link className={classes} to={to} aria-label={t('brand.homeLabel')}>
      <span className="brand__mark" aria-hidden="true">
        <span />
        <span />
      </span>
      <span className="brand__name">{name}</span>
    </Link>
  )
}

export default Brand
